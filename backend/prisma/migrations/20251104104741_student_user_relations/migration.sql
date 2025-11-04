-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_email_fkey" FOREIGN KEY ("email") REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE;
